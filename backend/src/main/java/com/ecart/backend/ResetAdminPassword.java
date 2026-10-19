
package com.ecart.backend;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Scanner;

public class ResetAdminPassword {

    public static void main(String[] args) {

        Scanner scanner = new Scanner(System.in);

        System.out.print("Enter your new admin password: ");
        String password = scanner.nextLine();

        if (password.length() < 12) {
            System.out.println(
                "Use a password with at least 12 characters."
            );
            scanner.close();
            return;
        }

        BCryptPasswordEncoder encoder =
            new BCryptPasswordEncoder();

        String hashedPassword = encoder.encode(password);

        System.out.println("\nYour BCrypt password hash is:");
        System.out.println(hashedPassword);

        scanner.close();
    }
}