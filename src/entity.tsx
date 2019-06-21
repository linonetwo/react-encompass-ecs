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

export const GameEntitiesContext = createContext<IEntityMap>({});

/**
 * Select entity with provided components, return components inside entity
 * ```js
 *   const { box } = useComponents({ box: [PositionComponent] });
 *   const position = box ? box[0] : { x: 20, y: 20 };
 * ```
 * Above example return singleton component inside box, if you warp some component in array, it will return an array of that type of components (not supported now due to my TypeScript knowledge limitation)
 */
export function useComponent<TComponent extends Component, T extends Type<TComponent> /* | Array<Type<TComponent>> */>(
  descriptions: { [name: string]: /* T[] */ Array<Type<TComponent>> },
  context: Context<IEntityMap> = GameEntitiesContext,
): {
  [name: string]: Array<
    Array</* T extends Array<Type<TComponent>> ? GCOptimizedList<Readonly<TComponent>> : */ Readonly<TComponent>>
  >;
} {
  // prevent object passed in trigger reRender, assume that description won't change on runtime
  const [selectedEntities, setter] = useImmer<IEntityResultMap>({});
  const entities = useContext(context);
  useEffect(() => {
    // select entities that match the components description
    setter(draft => {
      for (const name of Object.keys(descriptions)) {
        for (const entity of Object.values(entities)) {
          const id = entity.get_component(ReactSyncComponent).entity_id;
          const components = descriptions[name];
          if (draft[name] === undefined) {
            draft[name] = {};
          }
          if (draft[name][id] !== entity && EntityChecker.check_entity(entity, flatten(components))) {
            draft[name][id] = entity;
          }
        }
      }
    });
    // only rerun this selection if entities changes
  }, [setter, entities]);
  const selectedComponents = useMemo(() => {
    const result = mapValues(selectedEntities, (entitiesWithSuchComponent, name) =>
      Object.values(entitiesWithSuchComponent).map(entity =>
        descriptions[name].map(component => {
          // if (Array.isArray(component)) {
          //   component as Array<Type<TComponent>>;
          //   return entity.get_components(component[0]);
          // }
          return entity.get_component(component);
        }),
      ),
    );
    // assign empty array, so you can xxx.map it easily in React
    for (const name of Object.keys(descriptions)) {
      if (!result[name]) {
        result[name] = [];
      }
    }
    return result;
  }, [selectedEntities]);
  useUpdate();

  return selectedComponents;
}

export function Provider(props: { children: React.ReactNode; entities: IEntityMap; context?: Context<IEntityMap> }) {
  const ProvidedContext = props.context || GameEntitiesContext;
  return <ProvidedContext.Provider value={props.entities}>{props.children}</ProvidedContext.Provider>;
}
