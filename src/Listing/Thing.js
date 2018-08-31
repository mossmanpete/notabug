import React, { PureComponent } from "react";
import debounce from "lodash/debounce";
import { injectState } from "freactal";
import { withRouter } from "react-router-dom";
import { Loading } from "utils";
import { Submission } from "Submission";
import { Comment } from "Comment";
import { ChatMsg } from "Chat/ChatMsg";

const components = {
  submission: Submission,
  comment: Comment,
  chatmsg: ChatMsg
};

class ThingBase extends PureComponent {
  constructor(props) {
    super(props);
    const { expanded = false } = props;
    const listing = props.listing || props.state.notabugApi.scopedListing();
    const scores = listing.thingScores.now(props.id) || { ups: 0, downs: 0, score: 0, comments: 0 };
    const item = listing.thingData.now(props.id);
    const parentItem = props.fetchParent && item && item.opId ? listing.thingData.now(item.opId) : null;
    this.listing = listing;
    if (props.realtime) this.listing.scope.realtime();
    this.state = { item, parentItem, scores, expanded };
    this.onRefresh = debounce(() => this.onUpdate(), 250);
  }

  componentDidMount = () => { this.onFetchItem(); this.onSubscribe(); };
  componentWillUnmount = () => this.onUnsubscribe();
  componentWillReceiveProps = (nextProps) =>
    (nextProps.realtime && !this.props.realtime)  && this.listing.scope.realtime();

  render() {
    const {
      id, isMine, rank, collapseThreshold=null, hideReply=false,
      Loading: LoadingComponent = Loading, ...props
    } = this.props;
    const { item, parentItem, scores, expanded } = this.state;
    const score = ((scores.ups || 0) - (scores.downs || 0) || 0);
    const ThingComponent = (item ? components[item.kind] : null);
    const collapsed = !isMine && !!((collapseThreshold!==null && (score < collapseThreshold)));
    if (item && !ThingComponent) return null;
    const thingProps = {
      ...props, ...scores,
      rank, id, item, parentItem,
      expanded, collapsed, collapseThreshold,
      hideReply, isMine,
      listing: this.listing,
      onToggleExpando: this.onToggleExpando
    };
    const renderComponent = ({ isVisible }) => !item
      ? <LoadingComponent {...thingProps} isVisible={isVisible} />
      : <ThingComponent {...thingProps} isVisible={isVisible} />;
    return renderComponent({ isVisible: true });
  }

  onToggleExpando = () => this.setState(({ expanded }) => ({ expanded: !expanded }));
  onSubscribe = () => this.listing.scope.on(this.onRefresh);
  onUnsubscribe = () => this.listing.scope.off(this.onRefresh);
  onUpdate = () => this.listing.thingScores(this.props.id)
    .then(scores => this.setState({ scores }));
  onUpdated = () => this.props.onDidUpdate && this.props.onDidUpdate();
  onFetchItem = () => this.listing.thingData(this.props.id)
    .then(item => this.setState({ item }, () =>
      (item && item.opId && this.props.fetchParent) && this.onFetchOpItem()))
    .then(() => this.onUpdated());
  onFetchOpItem = () => this.listing.thingData(this.state.item.opId)
    .then(parentItem => this.setState({ parentItem }))
    .then(() => this.onUpdated());
}

export const Thing = withRouter(injectState(ThingBase));