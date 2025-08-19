import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupplierListComponent } from './components/supplier-list/supplier-list.component';
import { SupplierFormComponent } from './components/supplier-form/supplier-form.component';

const routes: Routes = [
  { path: 'suppliers', component: SupplierListComponent },
  { path: 'suppliers/new', component: SupplierFormComponent },
  { path: 'suppliers/edit/:id', component: SupplierFormComponent },
  // Add other routes here if needed, for example, a default redirect
  { path: '', redirectTo: '/suppliers', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
