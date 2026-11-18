import { Injectable, signal } from "@angular/core";

/** Where the visitor currently is in the collection, shared by both views. */
@Injectable({ providedIn: "root" })
export class PlaceService {
  readonly current = signal("entrance");
}
