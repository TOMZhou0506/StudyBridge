import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorSessions } from './tutor-sessions';

describe('TutorSessions', () => {
  let component: TutorSessions;
  let fixture: ComponentFixture<TutorSessions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorSessions],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorSessions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
