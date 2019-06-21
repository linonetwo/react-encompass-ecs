import { Subject } from 'rxjs';
import { Renders, EntityRenderer, GeneralRenderer, Entity, WorldBuilder } from 'encompass-ecs';
import { produce } from 'immer';
import { ReactSyncComponent } from './component';
import { IEntityMap } from './entity';

export const updaterContext: Subject<boolean> = new Subject();
export class EntitySyncer {
  public entities: IEntityMap;
  /** trigger component update by flipping boolean value */

  private currentUpdaterValue: boolean = true;

  constructor(worldBuilder: WorldBuilder) {
    this.entities = {};
    const updateEntitiesStore = produce((draft, id, newEntity) => {
      draft[id] = newEntity;
    });
    const store = this; // tslint:disable-line no-this-assignment pass this from this class to temporary classes below

    @Renders(ReactSyncComponent)
    class ReactSyncRenderer extends EntityRenderer {
      // this got called on every entity on every render tick
      public render(currentEntity: Entity) {
        // put current entity into the resulting entity map, update the old one
        const id = currentEntity.get_component(ReactSyncComponent).entity_id;
        store.entities = updateEntitiesStore(store.entities, id, currentEntity);
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
}
