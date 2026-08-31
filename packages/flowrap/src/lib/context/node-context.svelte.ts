import { getContext, setContext } from 'svelte';
import { NODE_CONTEXT_KEY } from '../types';
import type { NodeContext } from '../types';

/**
 * The node's minimal context. A port has to know which node it sits in,
 * and shouldn't demand that as a prop — otherwise every `<FlowHandle>`
 * would have to repeat `node="a"`.
 */
export function setNodeContext(ctx: NodeContext): void {
  setContext(NODE_CONTEXT_KEY, ctx);
}

export function getNodeContext(): NodeContext {
  const ctx = getContext<NodeContext | undefined>(NODE_CONTEXT_KEY);
  if (!ctx) {
    throw new Error('[flowrap] <FlowHandle> must be rendered inside <FlowNode>');
  }
  return ctx;
}
