import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LearnerBookings } from './learner-bookings';

describe('LearnerBookings', () => {
  let component: LearnerBookings;
  let fixture: ComponentFixture<LearnerBookings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LearnerBookings],
    }).compileComponents();

    fixture = TestBed.createComponent(LearnerBookings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
