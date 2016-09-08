/*
 * ssd_test_code.h
 *
 *  Created on: 18/lug/2016
 *      Author: D. Martello
 */
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <time.h>
#define DAC_ADDR		0x0C // DAC slave address DAC AD5316
#ifndef SSD_TEST_CODE_H_
#define SSD_TEST_CODE_H_
int set_led(int,int,int,int);
int led_loop(int event_bunch);
int acquire_evt(FILE *fp1, int fd , unsigned *page_offset);
int acquire_ch(FILE *fp1,  unsigned *page_offset,int CH, int nWord);
int set_hv(int hv);
int set_PMT_hv (int chan, int value);
int scope_evt( unsigned *page_offset);
int set_trigger(int threshold1, int threshold2, int threshold3, int mode);
#endif /* SSD_TEST_CODE_H_ */
