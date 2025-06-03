import {AfterViewInit, Component, ElementRef, OnInit, signal, ViewChild} from '@angular/core';
import * as THREE from 'three';
import Globe from 'three-globe';
import {ButtonComponent} from "../../components/button/button.component";

@Component({
  selector: 'app-about',
  standalone: true,
    imports: [
        ButtonComponent
    ],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent implements OnInit, AfterViewInit {
  hasCopied = signal(false);
  @ViewChild('globeCanvas', { static: true }) canvasRef!: ElementRef<HTMLDivElement>;

  copyEmail(): void {
    navigator.clipboard.writeText('adrian@jsmastery.pro').then(() => {
      this.hasCopied.set(true);
      setTimeout(() => this.hasCopied.set(false), 2000);
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    const width = 326;
    const height = 326;

    renderer.setSize(width, height);
    this.canvasRef.nativeElement.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 200;

    const globe = new Globe()
        .globeImageUrl('//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .showAtmosphere(true)
        .labelsData([{ lat: 40, lng: -100, text: 'Rjieka, Croatia', color: 'white', size: 15 }]);

    scene.add(globe);

    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);


    const animate = () => {
      requestAnimationFrame(animate);
      globe.rotation.y += 0.0015;
      renderer.render(scene, camera);
    };
    animate();
  }
}
