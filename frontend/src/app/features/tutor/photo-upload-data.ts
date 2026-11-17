import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';

export interface PhotoUploadResponse {
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class PhotoUploadData {
  private readonly http = inject(HttpClient);
  private readonly uploadUrl = environment.photoUploadUrl;

  // A3 HD Task 3: Uploads one image directly to the Cloud Run service.
  uploadPhoto(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<PhotoUploadResponse>(
      `${this.uploadUrl}/upload`,
      formData,
    );
  }
}
