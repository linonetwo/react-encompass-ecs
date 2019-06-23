import { Subject } from 'rxjs';
import {
  Renders,
  EntityRenderer,
  GeneralRenderer,
  Entity,
  WorldBuilder,
  Component,
  Type,
  EntityChecker,
} from 'encompass-ecs';
import { flatten, mapValues } from 'lodash';
import { ReactSyncComponent } from './component';
import { IEntityMap } from './entity';

export interface IEntityResultMap {
  [name: string]: {
    [id: number]: Entity;
  };
}

export const updaterContext: Subject<boolean> = new Subject();
export class EntitySyncer {
  public entities: IEntityMap;
  /** trigger component update by flipping boolean value */

  private currentUpdaterValue: boolean = true;

  constructor(worldBuilder: WorldBuilder) {
    // TODO: use weak map instead
    this.entities = {};
    const store = this; // tslint:disable-line no-this-assignment pass this from this class to temporary classes below

    @Renders(ReactSyncComponent)
    class ReactSyncRenderer extends EntityRenderer {
      // this got called on every entity on every render tick
      public render(currentEntity: Entity) {
        // put current entity into the resulting entity map, update the old one
        const id = currentEntity.get_component(ReactSyncComponent).entity_id;
        store.entities[id] = currentEntity;
      }
    }
    worldBuilder.add_renderer(ReactSyncRenderer);

    updaterContext.subscribe(currentValue => (store.currentUpdaterValue = currentValue));
    class ReactReRenderTriggerRenderer extends GeneralRenderer {
      public layer = 1;
      // this got called once every render tick
      public render() {
        updaterContext.next(!store.currentUpdaterValue);
      }
    }
    worldBuilder.add_renderer(ReactReRenderTriggerRenderer);
  }

  public useComponent<TComponent extends Component, T extends Type<TComponent> /* | Array<Type<TComponent>> */>(
    descriptions: { [name: string]: /* T[] */ Array<Type<TComponent>> },
    forceRender: boolean = false,
  ): {
    [name: string]: Array<
      Array</* T extends Array<Type<TComponent>> ? GCOptimizedList<Readonly<TComponent>> : */ Readonly<TComponent>>
    >;
  } {
    // select entities that match the components description
    // TODO: extract this to a memorized function, invalided when "entities" changes
    const selectedEntities: IEntityResultMap = {};
    for (const name of Object.keys(descriptions)) {
      for (const entity of Object.values(this.entities)) {
        const id = entity.get_component(ReactSyncComponent).entity_id;
        const components = descriptions[name];
        if (selectedEntities[name] === undefined) {
          selectedEntities[name] = {};
        }
        if (selectedEntities[name][id] !== entity && EntityChecker.check_entity(entity, flatten(components))) {
          selectedEntities[name][id] = entity;
        }
      }
    }
    // TODO: extract this to a memorized function, invalided when "selectedEntities" changes
    const selectedComponents = mapValues(selectedEntities, (entitiesWithSuchComponent, name) =>
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
      if (!selectedComponents[name]) {
        selectedComponents[name] = [];
      }
    }

    return selectedComponents;
  }
}
