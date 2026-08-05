import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { of, Subject } from 'rxjs';
import { BeneficiariesService } from '../../core/services/beneficiaries.service';
import { BenefitDeliveriesService } from '../../core/services/benefit-deliveries.service';
import { BenefitsService } from '../../core/services/benefits.service';
import { CharityProgramsService } from '../../core/services/charity-programs.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalService } from '../../shared/components/modal/modal.service';
import { BenefitDeliveriesPage } from './benefit-deliveries.page';

describe('BenefitDeliveriesPage', () => {
  afterEach(() => {
    mock.reset();
  });

  it('shares the initial beneficiary options request across filter and form consumers', () => {
    const beneficiaryRequest = new Subject<{ items: []; meta: object }>();
    const listBeneficiaries = mock.fn(() => beneficiaryRequest.asObservable());
    const injector = Injector.create({
      providers: [
        { provide: FormBuilder, useValue: new FormBuilder() },
        {
          provide: BeneficiariesService,
          useValue: { list: listBeneficiaries },
        },
        {
          provide: BenefitDeliveriesService,
          useValue: {
            list: () => of({ items: [], meta: {} }),
          },
        },
        {
          provide: BenefitsService,
          useValue: {
            list: () => of({ items: [], meta: {} }),
          },
        },
        {
          provide: CharityProgramsService,
          useValue: {
            list: () => of({ items: [], meta: {} }),
          },
        },
        { provide: Router, useValue: {} },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({})) },
        },
        { provide: ToastService, useValue: {} },
        { provide: ModalService, useValue: {} },
      ],
    });

    const page = runInInjectionContext(injector, () => new BenefitDeliveriesPage());
    page.ngOnInit();

    assert.equal(listBeneficiaries.mock.callCount(), 1);
    beneficiaryRequest.next({ items: [], meta: {} });
    beneficiaryRequest.complete();
  });
});
