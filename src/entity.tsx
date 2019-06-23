import React, { useEffect, createContext, useContext, Context, useMemo } from 'react';
import { Component, Entity, EntityChecker, Type } from 'encompass-ecs';
import { GCOptimizedList } from 'encompass-gc-optimized-collections';
import { useImmer } from 'use-immer';
import { flatten, mapValues } from 'lodash';

import { useUpdate } from './updator';
import { ReactSyncComponent } from './component';

export interface IEntityMap {
  [name: string]: Entity;
}
export interface IEntityResultMap {
  [name: string]: {
    [id: number]: Entity;
  };
}

export const GameStoreContext = createContext<IEntityMap>({});

/**
 * Select entity with provided components, return components inside entity
 * ```js
 *   const { box } = useComponents({ box: [PositionComponent] });
 *   const position = box ? box[0] : { x: 20, y: 20 };
 * ```
 * Above example return singleton component inside box, if you warp some component in array, it will return an array of that type of components (not supported now due to my TypeScript knowledge limitation)
 * 
 * @param {boolean} [forceRender=false] reRender component on draw tick, only enable this when update you component 60 times per second is not costly
 */
export function useComponent<TComponent extends Component, T extends Type<TComponent> /* | Array<Type<TComponent>> */>(
  descriptions: { [name: string]: /* T[] */ Array<Type<TComponent>> },
  forceRender: boolean = false,
  context: Context<IEntityMap> = GameStoreContext,
): {
  [name: string]: Array<
    Array</* T extends Array<Type<TComponent>> ? GCOptimizedList<Readonly<TComponent>> : */ Readonly<TComponent>>
  >;
} {
  // prevent object passed in trigger reRender, assume that description won't change on runtime
  const [selectedEntities, setter] = useImmer<IEntityResultMap>({});
  const store = useContext(context);
  useUpdate(forceRender);

  // TODO: call async version of EntitySyncer, or its warper here
  return selectedComponents;
}

// TODO: pass down EntitySyncer, or its warper
export function Provider(props: { children: React.ReactNode; entities: IEntityMap; context?: Context<IEntityMap> }) {
  const ProvidedContext = props.context || GameStoreContext;
  return <ProvidedContext.Provider value={props.entities}>{props.children}</ProvidedContext.Provider>;
}
