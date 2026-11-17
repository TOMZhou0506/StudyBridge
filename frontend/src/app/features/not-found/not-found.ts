import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// A3 Task 2: Provides the fallback view for unmatched routes.
@Component({
  imports: [RouterLink],
  selector: 'app-not-found',
  styleUrl: './not-found.scss',
  templateUrl: './not-found.html',
})
export class NotFound {}
