import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CostPreview } from './cost-preview';

describe('CostPreview', () => {
  let component: CostPreview;
  let fixture: ComponentFixture<CostPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CostPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(CostPreview);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('agreedRate', 60);
    fixture.componentRef.setInput('durationMinutes', 90);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
