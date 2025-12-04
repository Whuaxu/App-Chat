import { UserService } from "@loopback/authentication";
import { User } from "../models";
import { Credentials, UserRepository } from "../repositories/user.repository";
import { securityId, UserProfile } from "@loopback/security";
import { repository } from "@loopback/repository";
import { HttpErrors } from "@loopback/rest";
import { inject } from "@loopback/core";
import { BcryptHasher } from "./hashPass.bcrypt";
import { PasswordHasherBindings } from "../keys";

export class myUserService implements UserService<User, Credentials> {

    constructor(
        @repository(UserRepository)
        public userRepository: UserRepository,
        @inject(PasswordHasherBindings.PASSWORD_HASHER)
        public hasher: BcryptHasher,
    ){}

    async verifyCredentials(credentials: Credentials): Promise<User> {
        
        const foundUser = await this.userRepository.findOne({
            where: {
                email: credentials.email,
            }
        });

        if(!foundUser){
            throw new HttpErrors.NotFound(`User not found with this ${credentials.email}`);
        }

        const passwordMatched = await this.hasher.comparePassword(credentials.password, foundUser.password);
        
        if(!passwordMatched){
            throw new HttpErrors.Unauthorized('Password is not valid');
        }

        return foundUser;
    }

    convertToUserProfile(user: User): UserProfile {
        
        let userName = '';
        if(user.firstName){
            userName = user.firstName;
        }

        return {
            [securityId]: `${user.id}`,
            name: userName
        };
    }
}