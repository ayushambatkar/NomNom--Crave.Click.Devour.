export interface IUserService {
  createUser(data: any): Promise<any>;
  getUser(id: string): Promise<any>;
}
