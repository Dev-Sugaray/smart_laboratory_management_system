import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SupplierListComponent } from './components/supplier-list/supplier-list.component';
import { SupplierFormComponent } from './components/supplier-form/supplier-form.component';
import { SupplierService } from './services/supplier.service';

@NgModule({
  declarations: [
    AppComponent,
    SupplierListComponent,
    SupplierFormComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [SupplierService],
  bootstrap: [AppComponent]
})
export class AppModule { }
