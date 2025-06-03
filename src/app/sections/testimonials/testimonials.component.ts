import { Component } from "@angular/core";
import { NgForOf } from "@angular/common";

@Component({
  selector: "app-testimonials",
  imports: [NgForOf],
  templateUrl: "./testimonials.component.html",
  styleUrl: "./testimonials.component.scss",
})
export class TestimonialsComponent {
  clientReviews = [
    {
      id: 1,
      review:
        '"Felix H. demonstrated his willingness to learn, flexibility, and strong comprehension skills by quickly adapting to new technologies such as Angular. His technically sound and conscientious approach consistently delivered flawless results."',
      name: "Team Lead, Polyoint AG",
      position: "Team Lead",
      img: "/assets/images/reviewer1.jpg",
    },
    {
      id: 2,
      review:
        "Felix H. demonstrated exceptional technical skills and a professional, empathetic approach in his role as a Software Developer. His structured and effective work style, combined with his above-average dedication, consistently delivered outstanding results.",
      name: "Software Manager, Eurotours",
      position: "Software Manager",
      img: "/assets/images/reviewer2.jpg",
    },
    // Add more reviews as needed
  ];
}
