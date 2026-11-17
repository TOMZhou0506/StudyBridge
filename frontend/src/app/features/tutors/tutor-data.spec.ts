import { TestBed } from '@angular/core/testing';
import { TutorData } from './tutor-data';

describe('TutorData', () => {
  let service: TutorData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TutorData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
