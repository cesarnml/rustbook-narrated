use std::io;

// ch02 starter: a loop that reads a number from the terminal and classifies
// it, until the user types "quit". Fill in the TODOs.

fn main() {
    loop {
        println!("Enter a number (or \"quit\"):");

        let mut input = String::new();
        io::stdin()
            .read_line(&mut input)
            .expect("failed to read line");
        let input = input.trim();

        // TODO 1: if input == "quit", break out of the loop.

        // TODO 2: parse `input` into an i32. `.trim().parse()` returns a
        // Result — for now, use `match` on it: on Err, print a message
        // like "not a number, try again" and `continue` the loop; on Ok,
        // bind the number and fall through to TODO 3.

        // TODO 3: classify the number with a `match` on (is it zero? does
        // it divide evenly by 2? is it negative?) and print one of:
        // "zero", "even", "odd" — plus, separately, "negative" first if
        // it's less than zero (so e.g. -4 prints "negative even").
    }
}
