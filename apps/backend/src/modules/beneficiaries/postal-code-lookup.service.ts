import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  BRAZIL_COUNTRY,
  formatBrazilianPostalCode,
  isValidBrazilianPostalCode,
  normalizeDigits,
  type Address,
} from '@solidarity-network/shared';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

@Injectable()
export class PostalCodeLookupService {
  async lookupBrazilianAddress(postalCode: string): Promise<Partial<Address>> {
    if (!isValidBrazilianPostalCode(postalCode)) {
      throw new BadRequestException({
        code: 'INVALID_POSTAL_CODE',
        message: 'CEP invalido.',
      });
    }

    const digits = normalizeDigits(postalCode);

    let response: Response;
    try {
      response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        headers: {
          Accept: 'application/json',
        },
      });
    } catch {
      throw new BadGatewayException({
        code: 'POSTAL_CODE_LOOKUP_FAILED',
        message: 'Falha ao consultar o CEP.',
      });
    }

    if (!response.ok) {
      throw new BadGatewayException({
        code: 'POSTAL_CODE_LOOKUP_FAILED',
        message: 'Falha ao consultar o CEP.',
      });
    }

    const payload = (await response.json()) as ViaCepResponse;

    if (payload.erro) {
      throw new BadRequestException({
        code: 'POSTAL_CODE_NOT_FOUND',
        message: 'CEP nao encontrado.',
      });
    }

    return {
      postalCode: payload.cep ?? formatBrazilianPostalCode(digits),
      street: payload.logradouro ?? '',
      district: payload.bairro ?? '',
      city: payload.localidade ?? '',
      state: payload.uf ?? '',
      complement: payload.complemento || undefined,
      country: BRAZIL_COUNTRY,
    };
  }
}
