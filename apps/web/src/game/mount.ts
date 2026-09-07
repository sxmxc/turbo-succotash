import Phaser from "phaser";
// Vue owns DOM and application state. This adapter exposes only lifecycle and typed preview commands.
export interface RoomView {
  destroy(): void;
  setAccent(color: number): void;
}
export function mountRoom(parent: HTMLElement, onReady: () => void): RoomView {
  let person: Phaser.GameObjects.Image | undefined;
  class Preview extends Phaser.Scene {
    create() {
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
      g.fillStyle(0x577c60).fillRect(64, 64, 24, 24).fillRect(392, 240, 24, 24);
      g.fillStyle(0xaabb80).fillRect(70, 68, 12, 12).fillRect(398, 244, 12, 12);
      const pixels = [
        "................",
        ".....333333.....",
        "....33333333....",
        "....32222223....",
        "....22022022....",
        ".....222222.....",
        "......2222......",
        "....11111111....",
        "...2111111112...",
        "...2111111112...",
        "....11111111....",
        ".....111111.....",
        ".....444444.....",
        ".....44..44.....",
        ".....44..44.....",
        "....444..444....",
      ];
      const palette: Record<string, string> = {
        "0": "#24323b",
        "1": "#ffffff",
        "2": "#dfb892",
        "3": "#423737",
        "4": "#24323b",
      };
      const texture = this.textures.createCanvas("placeholder-person", 16, 16);
      if (!texture) throw new Error("Could not create placeholder texture");
      pixels.forEach((row, y) =>
        [...row].forEach((pixel, x) => {
          if (palette[pixel]) {
            texture.context.fillStyle = palette[pixel];
            texture.context.fillRect(x, y, 1, 1);
          }
        }),
      );
      texture.refresh();
      person = this.add
        .image(240, 152, "placeholder-person")
        .setScale(2)
        .setTint(0xefd6a2);
      onReady();
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 480,
    height: 312,
    pixelArt: true,
    backgroundColor: "#192b32",
    scene: Preview,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { keyboard: false },
    audio: { noAudio: true },
    banner: false,
  });
  return {
    destroy: () => game.destroy(true),
    setAccent: (color) => person?.setTint(color),
  };
}
