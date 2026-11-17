import { TestBed } from '@angular/core/testing';
import { OfflineCache } from './offline-cache';

describe('OfflineCache', () => {
  let service: OfflineCache;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OfflineCache);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
