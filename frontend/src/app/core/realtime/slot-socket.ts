import { Service } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../../environments/environment';

// A3 Task 10: Defines and exposes live slot availability events over Socket.io.
export interface SlotAvailabilityEvent {
  slotId: string;
  tutorId: string;
}

// Maintains one Socket.io connection for live slot availability.
@Service()
export class SlotSocket {
  // Connects to the backend origin without its REST API path.
private readonly socketUrl = new URL(
  environment.apiBaseUrl,
  window.location.origin,
).origin;

  // Creates one shared socket connection for this service instance.
  private readonly socket: Socket = io(this.socketUrl);

  // Emits whenever the backend reports that a slot was booked.
  readonly slotBooked = this.createEventStream('slot:booked');

  // Emits whenever the backend reports that a slot was freed.
  readonly slotFreed = this.createEventStream('slot:freed');

  // Converts one Socket.io event into an Angular-friendly Observable.
  private createEventStream(
    eventName: 'slot:booked' | 'slot:freed',
  ): Observable<SlotAvailabilityEvent> {
    return new Observable<SlotAvailabilityEvent>((subscriber) => {
      const handler = (event: SlotAvailabilityEvent) => {
        subscriber.next(event);
      };

      this.socket.on(eventName, handler);

      // Removes only this subscription while keeping the shared socket alive.
      return () => this.socket.off(eventName, handler);
    });
  }
}
