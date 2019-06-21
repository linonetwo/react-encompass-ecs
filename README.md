# react-encompass-ecs

Sync data from encompass-ecs to React

## Usage

Full example: [react-encompass-ecs-example](https://github.com/linonetwo/react-encompass-ecs-example)

Init Encompass World:

```js
import { EntitySyncer } from 'react-encompass-ecs';

export function initGameWorld() {
  const worldBuilder = new WorldBuilder();
  worldBuilder.add_engine(TileMapSpawner);
  worldBuilder.add_engine(BoxSpawner);
  worldBuilder.add_engine(MotionEngine);
  worldBuilder.add_engine(VelocityEngine);

  const instantizationMessage = worldBuilder.emit_message(instantizationMessage);
  instantizationMessage.mapDefinition = ``;

  const entityStore = new EntitySyncer(worldBuilder);
  const world = worldBuilder.build();
  return { world, entityStore };
}
```

Set up game loop:

```js
export function useGame(): [GameState, MainLoop] {
  const [currentGameEntities, setGameEntities] = useState({});
  return [
    currentGameEntities,
    useMemo(() => {
      const { world, entityStore } = initGameWorld();
      const TIMESTEP = 1000 / config.gameConfig.UPS;
      const gameLoop = MainLoop.setSimulationTimestep(TIMESTEP)
        .setMaxAllowedFPS(config.gameConfig.FPS)
        .setUpdate(deltaT => {
          world.update(deltaT);
        })
        .setDraw(() => {
          world.draw();
          // only actually update when entity changed, component change won't trigger setState, because this is a reference
          setGameEntities(entityStore.entities);
        })
        .setEnd((fps, panic) => {
          if (panic) {
            gameLoop.resetFrameDelta();
          }
        });
      gameLoop.start();
      return gameLoop;
    }, []),
  ];
}
```

Use gameloop in React app:

```jsx
import { Provider as EntityProvider, IEntityMap, useComponent } from 'react-encompass-ecs';

export default function App() {
  const [currentGameEntities] = useGame();
  return (
    <Container>
      <Canvas
        invalidateFrameloop
        style={{ background: '#324444' }}
        camera={{ position: [0, 0, 15], rotation: [(15 * Math.PI) / 180, 0, 0] }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <EntityProvider entities={currentGameEntities}>
          <Scene />
        </EntityProvider>
      </Canvas>
      <StatsGraph />
    </Container>
  );
}
```

Draw something with React libraries, for example, `react-three-fiber`:

```jsx
function Plane() {
  const { boxes } = useComponent({ boxes: [PositionComponent] });
  return (
    <>
      {boxes.map((box, index) => {
        const [position] = box;
        return (
          <mesh receiveShadow={true} position={[position.x, position.y, 0]} key={index}>
            <planeBufferGeometry attach="geometry" args={[20, 20]} />
            <meshPhongMaterial attach="material" color="#272727" />
          </mesh>
        );
      })}
    </>
  );
}

function Scene() {
  // Hook into the render loop and rotate the scene a bit
  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight intensity={0.6} position={[30, 30, 50]} angle={0.2} penumbra={1} castShadow={true} />
      <Plane />
    </>
  );
}
```

Spawn entities:

```js
import { ReactSyncComponent } from 'react-encompass-ecs';

@Reads(MapInstantizationMessage)
export class BoxSpawner extends Spawner {
  public spawn(message: MapInstantizationMessage) {
    for (let count = 0; count < 100; count += 1) {
      const boxEntity = this.create_entity();
      boxEntity.add_component(ReactSyncComponent);
      const position = boxEntity.add_component(PositionComponent);
      position.x = 0;
      position.y = 0;
      const velocity = boxEntity.add_component(VelocityComponent);
      velocity.x = 3 * Math.random();
      velocity.y = 3 * Math.random();
    }
  }
}
```
