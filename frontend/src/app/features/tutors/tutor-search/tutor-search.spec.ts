import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorSearch } from './tutor-search';

describe('TutorSearch', () => {
  let component: TutorSearch;
  let fixture: ComponentFixture<TutorSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorSearch],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
