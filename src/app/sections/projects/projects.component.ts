import {AfterViewInit, Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-projects',
  standalone: true,
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss'],
  imports: [NgForOf, NgIf],
})
export class ProjectsComponent implements AfterViewInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  selectedProjectIndex = 0;
  model?: THREE.Object3D;
  screenMesh?: THREE.Mesh;
  scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;
  textureLoader = new THREE.TextureLoader();

  myProjects = [
    {
      title: 'GreenWave',
      desc: 'GPS traffic light optimizer.',
      subdesc: 'Built with Angular + Leaflet + Crowdsourcing.',
      logo: '/assets/logos/green.svg',
      logoStyle: { backgroundColor: '#005f00' },
      spotlight: '/assets/images/spotlight-1.jpg',
      texture: '/assets/textures/projects/greenwave.png',
      tags: [
        { name: 'Angular', path: '/assets/logos/angular.svg' },
        { name: 'Java', path: '/assets/logos/spring.svg' },
        { name: 'SpringBoot', path: '/assets/logos/spring.svg' },
        { name: 'Leaflet', path: '/assets/logos/leaflet.svg' },
      ],
      href: 'https://greenwave-webapp.onrender.com',
    },
    {
      title: 'WheelWallet',
      desc: 'All-in-one car manager.',
      subdesc: 'Documents, maintenance, and trips.',
      logo: '/assets/logos/car.svg',
      logoStyle: { backgroundColor: '#222' },
      spotlight: '/assets/images/spotlight-2.jpg',
      texture: '/assets/textures/projects/wheel-wallet.png',
      tags: [
        { name: 'Angular', path: '/assets/logos/angular.svg' },
        { name: 'Java', path: '/assets/logos/java.svg' },
        { name: 'SpringBoot', path: '/assets/logos/spring.svg' },
      ],
      href: '',
    },
  ];

  get currentProject() {
    return this.myProjects[this.selectedProjectIndex];
  }

  handleNavigation(direction: 'previous' | 'next') {
    this.selectedProjectIndex =
        direction === 'previous'
            ? (this.selectedProjectIndex - 1 + this.myProjects.length) % this.myProjects.length
            : (this.selectedProjectIndex + 1) % this.myProjects.length;

    this.updateTexture(); // Update screen on project switch
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    this.scene.add(new THREE.AmbientLight(0xffffff, 2));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = false;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.minPolarAngle = Math.PI / 3;

    this.loadModel();
    this.animate();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private loadModel(): void {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/assets/draco/');
    loader.setDRACOLoader(dracoLoader);

    loader.load('/assets/models/smartphone.glb', (gltf :any) => {
      this.model = gltf.scene;
      this.model?.position.set(0, 0, 0);
      this.model?.scale.set(20, 20, 20);
      this.model?.rotation.set(0, 0, 0);

      if (!this.model) return;

      this.scene.add(this.model);

      // Find screen mesh
      this.model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && child.name === 'Object_4') {
          this.screenMesh = child as THREE.Mesh;
          this.updateTexture();
        }
      });
    });
  }

  private updateTexture(): void {
    if (!this.screenMesh) return;

    const texture = this.textureLoader.load(this.currentProject.texture, () => {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      this.screenMesh!.material = new THREE.MeshBasicMaterial({map: texture});
      this.screenMesh!.material.needsUpdate = true;
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    const canvas = this.canvasRef.nativeElement;
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  }
}
