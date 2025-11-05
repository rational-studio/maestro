import { type StepInstance } from '../step/types';
import { type DeserializableEdgeFunc, type Edge, type SerializableEdge } from './type';

const defaultDeserializeFn = (): never => {
  throw new Error('EdgeFactorySerializable: deserialize not implemented');
};

export function createSerializableEdge<
  EdgeCreatorFn extends (
    from: StepInstance<any, any, any, any, any>,
    to: StepInstance<any, any, any, any, any>,
    ...args: any[]
  ) => SerializableEdge<any, any>,
>(edgeFn: EdgeCreatorFn): EdgeCreatorFn & DeserializableEdgeFunc {
  const edgeFnPlusSerializer = edgeFn as EdgeCreatorFn & DeserializableEdgeFunc;
  edgeFnPlusSerializer.deserialize = defaultDeserializeFn;
  return edgeFnPlusSerializer;
}

export function createEdge<
  EdgeCreatorFn extends (
    from: StepInstance<any, any, any, any, any>,
    to: StepInstance<any, any, any, any, any>,
    ...args: any[]
  ) => Edge<any, any>,
>(edgeFn: EdgeCreatorFn): EdgeCreatorFn {
  return edgeFn;
}
