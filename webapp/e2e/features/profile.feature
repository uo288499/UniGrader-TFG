Feature: Update profile password

  Scenario: Change password and log in with the new password
    Given I am logged in as the global admin
    When I navigate to my profile
    And I change my password
    Then I should see a success message
    When I log out
    And I log in with the new password
    Then I should be redirected to home