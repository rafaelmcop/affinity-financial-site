import {r as React,j as jsx} from './index-BIU-6RMI.js?v=20261009-setup-1';
import {mountEmailReviews} from '/email-review-panel.js?v=1';
export default function AgentEmailReviews(){const ref=React.useRef(null);React.useEffect(()=>mountEmailReviews(ref.current),[]);return jsx.jsx('section',{ref});}
