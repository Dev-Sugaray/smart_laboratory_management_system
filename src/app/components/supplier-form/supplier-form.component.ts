import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Supplier } from '../../models/supplier.model';
import { SupplierService } from '../../services/supplier.service';

@Component({
  selector: 'app-supplier-form',
  templateUrl: './supplier-form.component.html',
  styleUrls: ['./supplier-form.component.css']
})
export class SupplierFormComponent implements OnInit {
  supplierForm: FormGroup;
  isEditMode = false;
  supplierId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private supplierService: SupplierService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.supplierForm = this.fb.group({
      name: ['', Validators.required],
      contactPerson: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.supplierId = this.route.snapshot.params['id'];
    if (this.supplierId) {
      this.isEditMode = true;
      this.loadSupplierData(this.supplierId);
    }
  }

  loadSupplierData(id: number): void {
    this.supplierService.getSupplier(id).subscribe(
      (supplier) => {
        this.supplierForm.patchValue(supplier);
      },
      (error) => {
        console.error('Error loading supplier:', error);
        // Optionally, navigate back or show an error message
      }
    );
  }

  onSubmit(): void {
    if (this.supplierForm.invalid) {
      return;
    }

    const supplierData: Supplier = this.supplierForm.value;

    if (this.isEditMode && this.supplierId) {
      this.supplierService.updateSupplier(this.supplierId, supplierData).subscribe(
        () => {
          this.router.navigate(['/suppliers']);
        },
        (error) => {
          console.error('Error updating supplier:', error);
        }
      );
    } else {
      this.supplierService.createSupplier(supplierData).subscribe(
        () => {
          this.router.navigate(['/suppliers']);
        },
        (error) => {
          console.error('Error creating supplier:', error);
        }
      );
    }
  }

  cancel(): void {
    this.router.navigate(['/suppliers']);
  }
}
