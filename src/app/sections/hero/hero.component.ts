import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

interface HeroSizes {
  deskScale: number;
  deskPosition: [number, number, number];
  deskRotation: [number, number, number];
}

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss'],
  imports: [],
})
export class HeroComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  private animationId: number = 0;
  mouseX = 0;
  mouseY = 0;
  modelObject?: THREE.Object3D;

  isSmall = false;
  isMobile = false;
  isTablet = false;
  sizes!: HeroSizes;

  ngOnInit(): void {
    this.isSmall = window.matchMedia('(max-width: 440px)').matches;
    this.isMobile = window.matchMedia('(max-width: 768px)').matches;
    this.isTablet = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;
    this.sizes = calculateSizes(this.isSmall, this.isMobile, this.isTablet);
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(1, -2, 10);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(ambientLight, directionalLight);

    this.loadModel();

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      if (this.modelObject) {
        const rotationFactor = 0.3;
        this.modelObject.rotation.y += (this.mouseX * rotationFactor - this.modelObject.rotation.y) * 0.1;
        this.modelObject.rotation.x += (this.mouseY * rotationFactor - this.modelObject.rotation.x) * 0.1;
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private loadModel(): void {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/assets/draco/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(
        '/assets/models/lowe.glb',
        (gltf) => {
          const model = gltf.scene;
          const group = new THREE.Group();
          group.add(model);

          const box = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.sub(center);

          group.position.set(...this.sizes.deskPosition.map((v, i) => (i === 1 ? v + 3 : v)) as [number, number, number]);
          group.rotation.set(...this.sizes.deskRotation);
          group.scale.setScalar(this.sizes.deskScale);

          this.modelObject = group;
          this.scene.add(group);
        },
        undefined,
        (error) => {
          console.error('Failed to load hacker-room model:', error);
        }
    );
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    this.mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const canvas = this.canvasRef.nativeElement;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.scene.clear();
    this.renderer.dispose();
  }

  protected readonly Math = Math;
}

function calculateSizes(
    isSmall: boolean,
    isMobile: boolean,
    isTablet: boolean
): HeroSizes {
  return {
    deskScale: isSmall ? 1.5 : isMobile ? 2 : 2.5,
    deskPosition: [0, -4, 0],
    deskRotation: [0, 0, 0],
  };
}
