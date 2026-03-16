import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
    @ApiProperty({
        example: 'eyJhbGciOiJSUzI1NiIs...',
        description: 'Google ID token from client-side Google Sign-In',
    })
    @IsString()
    @IsNotEmpty()
    idToken: string;
}
