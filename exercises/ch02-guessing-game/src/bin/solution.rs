use std::io;

fn main() {
    loop {
        println!("Enter a number (or \"quit\"):");

        let mut input = String::new();
        io::stdin()
            .read_line(&mut input)
            .expect("failed to read line");
        let input = input.trim();

        if input == "quit" {
            break;
        }

        let number: i32 = match input.parse() {
            Ok(n) => n,
            Err(_) => {
                println!("not a number, try again");
                continue;
            }
        };

        let sign = if number < 0 { "negative " } else { "" };
        let parity = match number {
            0 => "zero",
            n if n % 2 == 0 => "even",
            _ => "odd",
        };
        println!("{sign}{parity}");
    }
}
