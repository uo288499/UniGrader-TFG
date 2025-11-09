Feature: Manage users and accounts

  Scenario: Create a user and account together
    Given I am logged in as the global admin
    When I open the users list
    Then I should see the global admin in the list
    When I create a new user with an account
    Then I should see the new user and account in the list

  Scenario: Create an account for an existing user
    Given I am logged in as the global admin
    When I create an account for an existing user
    Then I should see the account linked to the user in the list