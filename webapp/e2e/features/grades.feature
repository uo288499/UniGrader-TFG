Feature: Manage grades

  Scenario: Create, evaluate, and filter grades
    Given I am logged in as a professor
    When I navigate to the group and create an evaluation item with invalid data
    Then I should see validation errors

    When I create a valid evaluation item
    Then I should see a success message

    When I evaluate a student
    Then I should see a success message

    When I log in as the student
    And I navigate to the grades view
    Then I should see the grades

    When I apply filters for the grades
    Then the filters should work correctly

    When I apply non matching filters for the grades
    Then the list should be empty