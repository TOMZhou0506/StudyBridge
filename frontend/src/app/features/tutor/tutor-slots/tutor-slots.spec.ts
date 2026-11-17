import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorSlots } from './tutor-slots';

describe('TutorSlots', () => {
  let component: TutorSlots;
  let fixture: ComponentFixture<TutorSlots>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorSlots],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorSlots);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
