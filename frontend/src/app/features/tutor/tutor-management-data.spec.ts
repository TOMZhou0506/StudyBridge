import { TestBed } from '@angular/core/testing';
import { TutorManagementData } from './tutor-management-data';

describe('TutorManagementData', () => {
  let service: TutorManagementData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TutorManagementData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
