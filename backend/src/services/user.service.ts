import { UserService } from "@loopback/authentication";
import { User } from "../models";
import { Credentials } from "../repositories/user.repository";
import { UserProfile } from "@loopback/security";

export class myUserService implements UserService<User, Credentials> {

    verifyCredentials(credentials: Credentials): Promise<User> {
        throw new Error("Method not implemented.");
    }
    
    convertToUserProfile(user: User): UserProfile {
        throw new Error("Method not implemented.");
    }

}