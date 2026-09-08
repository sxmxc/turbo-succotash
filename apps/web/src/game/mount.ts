import Phaser from "phaser";
import {
  catalog,
  characterGeometry,
  frameFor,
  initialAppearance,
  walkFrameMs,
  type Direction,
} from "./appearance";
import type { RoomPlayer } from "../realtime";
import { createRoom, preloadRoom, roomAsset } from "./tiledRoom";

export interface RoomView {
  destroy(): void;
  setPlayers(players: RoomPlayer[], localSessionId: string): void;
  setBubbles(bubbles: Record<string, string>): void;
}

export function mountRoom(
  parent: HTMLElement,
  onReady: () => void,
  onError: () => void,
  onMoveTo: (x: number, y: number) => void,
  onMove: (dx: number, dy: number) => void,
): RoomView {
  let players: RoomPlayer[] = [];
  let localSessionId = "";
  let bubbles: Record<string, string> = {};
  const entities = new Map<
    string,
    {
      container: Phaser.GameObjects.Container;
      layers: {
        asset: (typeof catalog)[number];
        sprite: Phaser.GameObjects.Sprite;
      }[];
      label: Phaser.GameObjects.Text;
      bubble: Phaser.GameObjects.Text;
      motion: string;
    }
  >();
  const tiledLobby = roomAsset("lobby");
  let cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  let wasdKeys:
    Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key> | undefined;
  let lastIntent = { dx: 0, dy: 0, sentAt: 0 };

  function keyboardBlocked() {
    const active = parent.ownerDocument.activeElement as HTMLElement | null;
    return Boolean(
      active?.matches(
        "input, textarea, select, button, [contenteditable=true]",
      ),
    );
  }

  function pollMovement(time: number) {
    if (!cursorKeys || !wasdKeys) return;
    const blocked = keyboardBlocked();
    const dx = blocked
      ? 0
      : Number(cursorKeys.right.isDown || wasdKeys.D.isDown) -
        Number(cursorKeys.left.isDown || wasdKeys.A.isDown);
    const dy = blocked
      ? 0
      : Number(cursorKeys.down.isDown || wasdKeys.S.isDown) -
        Number(cursorKeys.up.isDown || wasdKeys.W.isDown);
    const changed = dx !== lastIntent.dx || dy !== lastIntent.dy;
    const moving = dx !== 0 || dy !== 0;
    if (changed || (moving && time - lastIntent.sentAt >= 120)) {
      onMove(dx, dy);
      lastIntent = { dx, dy, sentAt: time };
    }
  }

  function registerAnimations(scene: Phaser.Scene) {
    for (const asset of catalog)
      for (const direction of ["north", "west", "south", "east"] as const) {
        const key = `${asset.id}:walk:${direction}`;
        if (scene.anims.exists(key)) continue;
        scene.anims.create({
          key,
          frames: asset.walkColumns.map((column) => ({
            key: asset.id,
            frame: asset.rows[direction] * asset.columns + column,
          })),
          frameRate: 1000 / walkFrameMs,
          repeat: -1,
        });
      }
  }

  function synchronize(currentScene?: Phaser.Scene) {
    const active = new Set(players.map((player) => player.sessionId));
    for (const [sessionId, entity] of entities)
      if (!active.has(sessionId)) {
        entity.container.destroy(true);
        entity.label.destroy();
        entity.bubble.destroy();
        entities.delete(sessionId);
      }
    for (const player of players) {
      let entity = entities.get(player.sessionId);
      if (!entity) {
        if (!currentScene) continue;
        const container = currentScene.add.container(player.x, player.y);
        const layers = [
          initialAppearance.body,
          initialAppearance.head,
          initialAppearance.pants,
          initialAppearance.shirt,
          initialAppearance.hair,
        ].map((id) => {
          const asset = catalog.find((entry) => entry.id === id)!;
          const sprite = currentScene.add
            .sprite(0, 0, asset.id)
            .setOrigin(
              asset.anchor.x / asset.frameWidth,
              asset.anchor.y / asset.frameHeight,
            )
            .setScale(characterGeometry.displayScale)
            .setFrame(frameFor(asset, player.direction as Direction, false, 0));
          container.add(sprite);
          return { asset, sprite };
        });
        entity = {
          container,
          layers,
          label: currentScene.add
            .text(player.x, player.y + 5, player.name, {
              fontFamily: "sans-serif",
              fontSize: "9px",
              color:
                player.sessionId === localSessionId ? "#f5d892" : "#e5ebe3",
              backgroundColor: "#122328cc",
              padding: { x: 3, y: 1 },
            })
            .setOrigin(0.5, 0),
          bubble: currentScene.add
            .text(player.x, player.y - 58, "", {
              fontFamily: "sans-serif",
              fontSize: "10px",
              color: "#263934",
              backgroundColor: "#f4f0e4",
              padding: { x: 6, y: 4 },
              wordWrap: { width: 130 },
              align: "center",
            })
            .setOrigin(0.5, 1)
            .setVisible(false),
          motion: "",
        };
        entities.set(player.sessionId, entity);
      }
      const direction = player.direction as Direction;
      const motion = `${direction}:${player.walking ? "walk" : "stand"}`;
      entity.container.setPosition(player.x, player.y).setDepth(player.y);
      for (const { asset, sprite } of entity.layers) {
        sprite.setTint(
          asset.id === initialAppearance.shirt
            ? player.shirtTint
            : asset.id === initialAppearance.pants
              ? 0x526582
              : 0xffffff,
        );
        if (motion === entity.motion) continue;
        if (player.walking) {
          sprite.play(`${asset.id}:walk:${direction}`, true);
        } else {
          sprite.stop();
          sprite.setFrame(frameFor(asset, direction, false, 0));
        }
      }
      entity.motion = motion;
      entity.label
        .setPosition(player.x, player.y + 5)
        .setDepth(player.y + 1)
        .setColor(player.sessionId === localSessionId ? "#f5d892" : "#e5ebe3");
      const bubble = bubbles[player.userId];
      entity.bubble
        .setPosition(player.x, player.y - 58)
        .setDepth(1000 + player.y)
        .setText(bubble ?? "")
        .setVisible(Boolean(bubble));
    }
  }

  class LobbyScene extends Phaser.Scene {
    preload() {
      this.load.on("loaderror", onError);
      for (const asset of catalog)
        this.load.spritesheet(asset.id, asset.url, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        });
      if (tiledLobby) preloadRoom(this, tiledLobby);
    }
    create() {
      if (catalog.some((asset) => !this.textures.exists(asset.id))) {
        onError();
        return;
      }
      registerAnimations(this);
      if (tiledLobby) {
        try {
          createRoom(this, tiledLobby);
        } catch {
          onError();
          return;
        }
      } else {
        const g = this.add.graphics();
        g.fillStyle(0x263e42).fillRect(24, 24, 432, 264);
        for (let y = 32; y < 280; y += 16)
          for (let x = 32; x < 448; x += 16)
            g.fillStyle((x + y) % 32 === 0 ? 0x45605c : 0x405956).fillRect(
              x,
              y,
              15,
              15,
            );
        g.fillStyle(0x192f34)
          .fillRect(24, 24, 432, 8)
          .fillRect(24, 24, 8, 264)
          .fillRect(448, 24, 8, 264)
          .fillRect(24, 280, 432, 8);
        g.fillStyle(0x8c7770).fillRect(320, 72, 64, 32);
        g.fillStyle(0xbaa18b).fillRect(324, 76, 56, 24);
        g.fillStyle(0x577c60)
          .fillRect(64, 64, 24, 24)
          .fillRect(392, 240, 24, 24);
        g.fillStyle(0xaabb80)
          .fillRect(70, 68, 12, 12)
          .fillRect(398, 244, 12, 12);
      }
      const keyboard = this.input.keyboard;
      if (!keyboard) {
        onError();
        return;
      }
      cursorKeys = keyboard.createCursorKeys();
      wasdKeys = keyboard.addKeys("W,A,S,D") as Record<
        "W" | "A" | "S" | "D",
        Phaser.Input.Keyboard.Key
      >;
      keyboard.on("keydown", (event: KeyboardEvent) => {
        if (
          !keyboardBlocked() &&
          ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(
            event.code,
          )
        )
          event.preventDefault();
      });
      this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (pointer.primaryDown) onMoveTo(pointer.worldX, pointer.worldY);
      });
      synchronize(this);
      onReady();
    }
    update(time: number) {
      pollMovement(time);
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 480,
    height: 312,
    pixelArt: true,
    backgroundColor: "#192b32",
    scene: LobbyScene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    audio: { noAudio: true },
    banner: false,
  });
  return {
    destroy: () => game.destroy(true),
    setPlayers: (nextPlayers, nextLocalSessionId) => {
      players = nextPlayers;
      localSessionId = nextLocalSessionId;
      synchronize();
    },
    setBubbles: (nextBubbles) => {
      bubbles = nextBubbles;
      synchronize();
    },
  };
}
