import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RefreshDto, RequestOtpDto, VerifyOtpDto } from './dto';
import { SnakeBody } from 'src/common/decorators/snake-body.decorator';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
    constructor(private authService: AuthService) { }
    
    @HttpCode(HttpStatus.OK)
    @Post('request-otp')
    requestOtp(@SnakeBody(RequestOtpDto) dto: RequestOtpDto) {
        return this.authService.requestOtp(dto.phoneNumber);
    }

    @HttpCode(HttpStatus.OK)
    @Post('resend-otp')
    resendOtp(@SnakeBody(RequestOtpDto) dto: RequestOtpDto) {
        return this.authService.requestOtp(dto.phoneNumber, true);
    }

    @HttpCode(HttpStatus.OK)
    @Post('verify-otp')
    verifyOtp(@SnakeBody(VerifyOtpDto) dto: VerifyOtpDto) {
        return this.authService.verifyOtp(dto.phoneNumber, dto.otp);
    }

    @HttpCode(HttpStatus.OK)
    @Get('guest')
    guestLogin() {
        return this.authService.guestLogin();
    }

    /**
     * Refresh the access and refresh tokens 
     * using a valid refresh token.
     */
    @HttpCode(HttpStatus.OK)
    @Post('refresh')
    refresh(@SnakeBody(RefreshDto) dto: RefreshDto) {
        return this.authService.refresh(dto.refreshToken);
    }
}
