/**
 * Sample data for the showcase: a pipeline that processes orders coming
 * in from a website.
 *
 * Just an array — nothing the library knows about. flowrap registers no
 * node types and keeps no graph: the card's shape comes from this demo's
 * markup, and the links live right here in `links`.
 */
export type NodeKind = 'ingest' | 'transform' | 'check' | 'sink' | 'alert';
export type NodeStatus = 'ok' | 'warn' | 'idle';

export interface PipelineNode {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
  icon: string;
  title: string;
  subtitle: string;
  metric: string;
  status: NodeStatus;
}

export interface PipelineLink {
  id: string;
  from: string;
  to: string;
  fromHandle?: string;
  toHandle?: string;
}

export const pipelineNodes: PipelineNode[] = [
  {
    id: 'ingest',
    x: 40,
    y: 180,
    kind: 'ingest',
    icon: '⇥',
    title: 'Webhook',
    subtitle: 'POST /api/orders',
    metric: '1,240 / min',
    status: 'ok'
  },
  {
    id: 'queue',
    x: 250,
    y: 180,
    kind: 'transform',
    icon: '≡',
    title: 'Queue',
    subtitle: 'Redis Streams',
    metric: 'depth 312',
    status: 'ok'
  },
  {
    id: 'parse',
    x: 465,
    y: 50,
    kind: 'transform',
    icon: '{ }',
    title: 'Parse',
    subtitle: 'JSON → Order',
    metric: '1,238 / min',
    status: 'ok'
  },
  {
    id: 'validate',
    x: 465,
    y: 310,
    kind: 'check',
    icon: '✓',
    title: 'Validate',
    subtitle: 'schema v4',
    metric: '0.4% rejected',
    status: 'warn'
  },
  {
    id: 'enrich',
    x: 685,
    y: 50,
    kind: 'transform',
    icon: '✦',
    title: 'Enrich',
    subtitle: 'CRM + geo',
    metric: '980 / min',
    status: 'ok'
  },
  {
    id: 'score',
    x: 685,
    y: 310,
    kind: 'transform',
    icon: '∿',
    title: 'Score',
    subtitle: 'model risk-v7',
    metric: 'p95 42 ms',
    status: 'ok'
  },
  {
    id: 'store',
    x: 905,
    y: 150,
    kind: 'sink',
    icon: '▤',
    title: 'Warehouse',
    subtitle: 'Postgres · orders',
    metric: '12.4M rows',
    status: 'ok'
  },
  {
    id: 'alerts',
    x: 905,
    y: 350,
    kind: 'alert',
    icon: '!',
    title: 'Alerts',
    subtitle: 'Slack #ops',
    metric: '3 today',
    status: 'idle'
  }
];

/** Ports: the source only has an out, the sinks only have an in. */
export const hasIn = (kind: NodeKind) => kind !== 'ingest';
export const hasOut = (kind: NodeKind) => kind !== 'sink' && kind !== 'alert';

export const pipelineLinks: PipelineLink[] = [
  { id: 'l1', from: 'ingest', to: 'queue', fromHandle: 'out', toHandle: 'in' },
  { id: 'l2', from: 'queue', to: 'parse', fromHandle: 'out', toHandle: 'in' },
  { id: 'l3', from: 'queue', to: 'validate', fromHandle: 'out', toHandle: 'in' },
  { id: 'l4', from: 'parse', to: 'enrich', fromHandle: 'out', toHandle: 'in' },
  { id: 'l5', from: 'validate', to: 'score', fromHandle: 'out', toHandle: 'in' },
  { id: 'l6', from: 'enrich', to: 'store', fromHandle: 'out', toHandle: 'in' },
  { id: 'l7', from: 'score', to: 'store', fromHandle: 'out', toHandle: 'in' },
  { id: 'l8', from: 'validate', to: 'alerts', fromHandle: 'out', toHandle: 'in' }
];
