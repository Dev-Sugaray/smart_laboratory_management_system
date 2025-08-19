import { Component, OnInit } from '@angular/core';
import { Supplier } from '../../models/supplier.model';
import { SupplierService } from '../../services/supplier.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-supplier-list',
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.css']
})
export class SupplierListComponent implements OnInit {
  suppliers: Supplier[] = [];

  constructor(
    private supplierService: SupplierService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.supplierService.getSuppliers().subscribe(
      (data) => {
        this.suppliers = data;
      },
      (error) => {
        console.error('Error loading suppliers:', error);
      }
    );
  }

  editSupplier(id: number): void {
    this.router.navigate(['/suppliers/edit', id]);
  }

  deleteSupplier(id: number): void {
    if (confirm('Are you sure you want to delete this supplier?')) {
      this.supplierService.deleteSupplier(id).subscribe(
        () => {
          this.loadSuppliers(); // Refresh the list
        },
        (error) => {
          console.error('Error deleting supplier:', error);
        }
      );
    }
  }

  navigateToAddSupplier(): void {
    this.router.navigate(['/suppliers/new']);
  }
}
