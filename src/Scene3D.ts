// @ts-check
import * as THREE from "three";
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  GlitchEffect,
  GlitchMode,
  PixelationEffect,
  ScanlineEffect,
  GridEffect,
  SMAAEffect,
  SMAAPreset,
  ChromaticAberrationEffect,
} from "postprocessing"; // https://github.com/pmndrs/postprocessing
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { fragmentShader2, vertexShader2 } from "./lib/shader2";
import { RectAreaLightHelper } from "./helpers/RectAreaLightHelper";
import { getRandomItem } from "./lib/utils";
import { RectAreaLightUniformsLib } from "./helpers/RectAreaLightUniformsLib";
import { OrbitControls } from "./controls/OrbitControls";

export default class Scene3D {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public composer: EffectComposer;
  public sceneObjects: any = [];
  public noteObjects: any = [];
  public glitch: GlitchEffect;
  public bloom: BloomEffect;
  public pixelate: PixelationEffect;
  public grid: GridEffect;
  public smaa: SMAAEffect;

  public ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0x888888);
  public uniforms: any;
  public megaLight: THREE.RectAreaLight = new THREE.RectAreaLight(
    0xffffff,
    120,
    120,
    120
  );
  public chroma: ChromaticAberrationEffect;
  public groupMsh: THREE.Group = new THREE.Group();
  public notes: any;
  public colors: any;
  public nbCube: number = 8;

  constructor(notes: any, colors: any) {
    this.notes = notes;
    this.colors = colors;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, -7);

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: "high-performance",
      antialias: false,
      stencil: false,
      depth: false,
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); //set pixel ratio
    this.renderer.setSize(window.innerWidth, window.innerHeight); // make it full screen
    this.renderer.outputEncoding = THREE.LinearEncoding; // set color encoding
    this.renderer.toneMapping = THREE.LinearToneMapping; // set the toneMapping
    this.renderer.toneMappingExposure = 1.2; // set the exposure

    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.chroma = new ChromaticAberrationEffect();
    this.chroma.radialModulation = true;
    this.chroma.modulationOffset = 5;
    this.composer.addPass(new EffectPass(this.camera, this.chroma));

    this.pixelate = new PixelationEffect();
    this.pixelate.granularity = 0;
    this.composer.addPass(new EffectPass(this.camera, this.pixelate));

    this.grid = new GridEffect({ scale: 1, lineWidth: 0.1 });
    this.composer.addPass(new EffectPass(this.camera, this.grid));

    this.glitch = new GlitchEffect();
    this.glitch.mode = GlitchMode.DISABLED;
    this.composer.addPass(new EffectPass(this.camera, this.glitch));

    this.bloom = new BloomEffect({
      intensity: 9,
      radius: 0.5,
      luminanceThreshold: 0.214,
      luminanceSmoothing: 0,
    });
    this.composer.addPass(new EffectPass(this.camera, this.bloom));

    this.smaa = new SMAAEffect({ preset: SMAAPreset.ULTRA });
    this.composer.addPass(new EffectPass(this.camera, this.smaa));

    document.body.appendChild(this.renderer.domElement);

    this.adjustLighting();
    this.addBasicCube();
    this.startShader();
    // this.loadObj();

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.update();
    window.addEventListener("resize", this.resize);
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); //set pixel ratio
    this.renderer.setSize(window.innerWidth, window.innerHeight); // make it full screen
  }
  loadObj() {
    const loader = new GLTFLoader();
    const _this = this;
    loader.load("WHDv-fish-tank.glb", this.addedSceneAfterLoad.bind(this));
  }

  addedSceneAfterLoad(glb: any) {
    this.groupMsh = glb.scene;
    this.scene.add(this.groupMsh);
  }

  startShader() {
    const geometry = new THREE.PlaneGeometry(2, 2);

    this.uniforms = {
      time: { value: 1.0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader2,
      fragmentShader: fragmentShader2,
      transparent: true,
      opacity: 0.025,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -13;
    // scene.add(mesh);
  }
  adjustLighting() {
    let pointLight: THREE.PointLight = new THREE.PointLight(0x333333);
    pointLight.position.set(-25, 13, -25);
    pointLight.intensity = 10;
    this.scene.add(pointLight);

    this.ambientLight = new THREE.AmbientLight(0x888888);
    this.scene.add(this.ambientLight);

    RectAreaLightUniformsLib.init();

    const w = 10;
    for (let r = 0; r < this.notes.length; r++) {
      const rectLight = new THREE.RectAreaLight(
        getRandomItem(this.colors),
        2,
        w,
        100
      );
      rectLight.power = 200;
      rectLight.intensity = 0;
      rectLight.height = 0;
      rectLight.position.x = (-this.notes.length * w) / 2 + (w + 2) * r;
      rectLight.position.z = 25;
      this.scene.add(rectLight);
      this.scene.add(new RectAreaLightHelper(rectLight));
      this.noteObjects[this.notes[r]] = rectLight;
    }

    this.megaLight = new THREE.RectAreaLight(0xffffff, 120, 120, 120);
    this.megaLight.power = 20;
    this.megaLight.intensity = 0;
    this.megaLight.position.z = -25;
    this.megaLight.rotation.x = 10;
    this.scene.add(this.megaLight);
    this.scene.add(new RectAreaLightHelper(this.megaLight));
  }
  addBasicCube() {
    // Cubes
    let geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    for (let r = 0; r < this.nbCube; r++) {
      let uniforms = {
        colorB: {
          type: "vec3",
          value: new THREE.Color(getRandomItem(this.colors)),
        },
        colorA: {
          type: "vec3",
          value: new THREE.Color(getRandomItem(this.colors)),
        },
      };

      let material = new THREE.MeshStandardMaterial({
        color: getRandomItem(this.colors),
        roughness: 0,
        metalness: 0,
        flatShading: false,
      });

      let mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = -this.nbCube + r * 2 + 0.5;
      this.scene.add(mesh);
      this.sceneObjects.push(mesh);
    }
  }
  updateAnimation(time: any, speed: number) {
    this.composer.render();

    this.uniforms["time"].value = time / 500;

    if (this.groupMsh) {
      this.groupMsh.rotation.y -= 0.1;
    }
    this.sceneObjects.forEach((object: THREE.Mesh, r: any) => {
      const delta = time / speed;
      // object.rotation.x += (popos + 1 / 100) * 2;
      // object.rotation.y += (popos / 2 + 1 / 200) * 2;
      // object.position.y = (Math.sin(delta + r) * (yy * 30) * nbCube) / 2;
      // object.position.z = (Math.sin(delta + r) * (xx * 30) * nbCube) / 2;
    });
  }
}
