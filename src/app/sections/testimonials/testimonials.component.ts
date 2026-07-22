import { Component } from "@angular/core";
import { RevealDirective } from "../../directives/reveal.directive";

@Component({
  selector: "app-testimonials",
  imports: [RevealDirective],
  templateUrl: "./testimonials.component.html",
  styleUrl: "./testimonials.component.scss",
})
export class TestimonialsComponent {
  clientReviews = [
    {
      id: 1,
      review:
        "Felix H. demonstrated his willingness to learn, flexibility, and strong comprehension skills by quickly adapting to new technologies such as Angular. His technically sound and conscientious approach consistently delivered flawless results.",
      name: "Polyoint AG",
      position: "Full Stack Developer",
      img: "assets/images/reviewer1.jpg",
    },
    {
      id: 2,
      review:
        "Felix H. demonstrated exceptional technical skills and a professional, empathetic approach in his role as a Software Developer. His structured and effective work style, combined with his above-average dedication, consistently delivered outstanding results.",
      name: "Eurotours",
      position: "Backend Developer",
      img: "assets/images/reviewer2.jpg",
    },
    // Add more reviews as needed
  ];
}
