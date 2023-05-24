import { TFilterValidator } from './Restify/validators/plugins/FilterValidator';

export interface IGetterQuery {
  $or?: { [key: string]: any }[];
  [key: string]: any;
}

export interface IRequest extends TFilterValidator {
  ids: string[];
  pagination?: {
    page: number;
    limit: number;
    skip: number;
    order_by: string;
    sort: 'asc' | 'desc';
  };
  limit: number;
}
