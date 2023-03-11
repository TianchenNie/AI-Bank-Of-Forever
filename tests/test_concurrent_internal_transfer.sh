time {
    # Define the number of processes to start
    n=100
    node set_initial_users.js
    wait

    # Start n instances of the javascript script
    for i in $(seq 1 $n); do
        node internal_transfer_worker.js $i &
    done

    # Wait for all background processes to complete
    wait

    node verify_internal_transfer.js $n
    wait
}