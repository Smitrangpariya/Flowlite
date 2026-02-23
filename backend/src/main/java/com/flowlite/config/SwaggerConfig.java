package com.flowlite.config;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@SecurityScheme(
    name = "bearerAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT",
    description = "Enter JWT token obtained from /api/auth/login"
)
public class SwaggerConfig {

    @Bean
    public OpenAPI flowLiteOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FlowLite API")
                        .version("1.0.0")
                        .description("Lightweight Workflow-Oriented Project Execution Platform API. " +
                                "This API provides endpoints for user authentication, task management, " +
                                "project management, and workflow approvals with role-based access control.")
                        .contact(new Contact()
                                .name("FlowLite Team")
                                .email("support@flowlite.com"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}

