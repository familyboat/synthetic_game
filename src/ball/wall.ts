import { Graphics, type Container, type Rectangle } from "pixi.js";
import { toPhysics } from "./utils";
import { Body, Box, type World } from "p2-es";

/**
 * 强，长方形，静态刚体；
 * 在渲染世界的尺寸：长为 20，高为屏幕高；
 * 在渲染世界的位置：待定，由外部决定
 */
export class Wall {
  private name = "wall";
  private widthInRender: number;
  private heightInRender: number;
  private xInRender: number;
  private yInRender: number;
  private world: World;
  private parent: Container;

  constructor(
    screen: Rectangle,
    world: World,
    parent: Container,
    xInRender: number,
    yInRender: number,
  ) {
    this.widthInRender = 20;
    this.heightInRender = screen.height;
    this.xInRender = xInRender;
    this.yInRender = yInRender;
    this.world = world;
    this.parent = parent;
  }

  init() {
    this.initRender();
    this.initPhysics();
  }

  private initRender() {
    const ground = new Graphics();
    ground.rect(
      this.xInRender,
      this.yInRender,
      this.widthInRender,
      this.heightInRender,
    );
    ground.fill("red");
    ground.label = this.name;

    this.parent.addChild(ground);
  }

  private initPhysics() {
    const rigidBody = new Body({
      type: Body.STATIC,
      mass: 0,
      position: [
        toPhysics(this.xInRender + this.widthInRender / 2),
        toPhysics(this.yInRender + this.heightInRender / 2),
      ]
    })
    const shape = new Box({
      width: toPhysics(this.widthInRender),
      height: toPhysics(this.heightInRender),
    })
    rigidBody.addShape(shape)
    this.world.addBody(rigidBody)
  }
}
