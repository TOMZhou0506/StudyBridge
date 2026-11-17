import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TutorDetail } from './tutor-detail';

describe('TutorDetail', () => {
  let component: TutorDetail;
  let fixture: ComponentFixture<TutorDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorDetail],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
